// 参考自 https://observablehq.com/@d3/grouped-bar-chart/2

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的产生是在外四边留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 10;
const marginRight = 10;
const marginBottom = 20;
const marginLeft = 40;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 主要使用 d3-selection 模块的 API
// 具体可以参考 https://github.com/d3/d3-selection 或 https://d3js.org/d3-selection
// 使用方法 d3.create("svg") 创建一个 svg 元素，并返回一个选择集 selection
// 使用选择集的方法 selection.attr() 为选择集中的所有元素（即 <svg> 元素）设置宽高和 viewBox 属性
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/stacked-bar-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/af1c6678ca209296a3d7995829b553dd/raw/077c859be6023d915f3501a058aecc4efc9e60da/us-population-state-age.csv";

// 读取 csv 文件并载入其中的数据集作为一个数组
// 参考 d3-dsv 模块 https://github.com/d3/d3-dsv
d3.csv(dataURL, d3.autoType).then((data) => {
  // 读取原始数据后得到一个数组
  // 返回的数组的每一元素都是一个对象，表示一个州的各个年龄段的人口数据
  console.log(data[0]);
  // D3 在解析 csv 表格生成数组时，为该数组添加了一个属性 columns，它也是一个数组，包含了表格的列属性
  // 这些对象中均包含 10 个属性，对应于 csv 表格中的 10 列
  // 余下的 8 列都是不同的年龄段，可以从中提取出所有的年龄段分类
  // ⚠️ 注意只从第二个元素开始提取 data.columns.slice(1) 因为 csv 的第一列是各州的名称 name ，并不是年龄段的分组
  // 可以提取到 9 个年龄段
  const ages = data.columns.slice(1);
  // console.log(data.columns);

  /**
   *
   * 对数据进行转换
   *
   */
  // 先使用方法 d3.sort() 进行排序
  // 第一个参数 data 是需要排序的可迭代对象（数组）
  // 第二个参数是 accessor 访问器，入参 d 是当前所遍历的数据点（一个州的数据），该州的总人口数（各年龄段的人口总和）作为返回值
  // 默认采用是升序排列，由于返回值前面添加负号，所以变成降序排列，即总人口数较多的州排名较前
  // 最后仅截取排好序的数组的前 6 项进行可视化
  const sortData = d3.sort(data, d => -d3.sum(ages, age => d[age])).slice(0, 6);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺，它由「宏观」和「微观」两个比例尺构成
  // 「宏观」比例尺用于将各组（整体）映射/定位到横坐标轴上
  // 「微观」比例尺用于安排各组内的条带映射/定位到组内区间上
  // fx 比例尺用于将 6 个州映射到横坐标轴上
  // 由于数据是不同的州（不同的分类），使用 d3.scaleBand 构建一个带状比例尺
  // 使用 d3-scale 模块
  // 具体参考官方文档 https://d3js.org/d3-scale/band 或 https://github.com/d3/d3-scale#scaleBand
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#带状比例尺-band-scales
  const fx = d3.scaleBand()
    // 设置定义域范围（6 个州，从 data 数据点的属性 d.name 所构成的集合种提取出所有的州）
    .domain(new Set(sortData.map(d => d.name)))
    // 设置值域范围
    // svg 元素的宽度（减去留白区域）
    // 使用 scale.rangeRound() 方法，可以进行修约，以便实现整数（6 个州）映射到整数（像素）
    .rangeRound([marginLeft, width - marginRight])
    .paddingInner(0.1); // 并设置间隔占据（每个州）区间的比例

  // x 比例尺用于将（年龄段）条带映射到组内区间上
  // 由于数据是的不同的年龄段（不同的分类），所以同样使用 d3.scaleBand 构建一个带状比例尺
  const x = d3.scaleBand()
    // 设置定义域范围（不同的年龄段的名称）
    .domain(ages)
    // 设置值域范围
    // 就是每个州的区间宽度，所以值域的上边界是前面带状比例尺 fx 的带宽
    .rangeRound([0, fx.bandwidth()])
    .padding(0.05); // 并设置间隔占据（每个条带）的比例

  // 设置颜色比例尺
  // 为不同年龄段设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  const color = d3.scaleOrdinal()
    // 设置定义域范围（不同的年龄段的名称）
    .domain(ages)
    // 设置值域范围
    // 使用 D3 内置的一种颜色比例尺 d3.schemeSpectral
    // 它是一个数组，包含一些预设的配色方案
    // 通过 d3.schemeSpectral[k] 的形式可以快速获取一个数组，其中包含 k 个元素，每个元素都是一个表示颜色的字符串
    // 其中 k 需要是 3~11 （包含）之间的数值
    // 具体参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#schemeSpectral 或 https://github.com/d3/d3-scale-chromatic/tree/main#schemeSpectral
    // 这里根据有多少种不同的年龄段生成相应数量的不同颜色值
    .range(d3.schemeSpectral[ages.length])
    // 设置默认颜色
    // 当使用颜色比例尺时 color(value) 传入的参数定义域范围中，默认返回的颜色值
    .unknown("#ccc");

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（6 个州的不同年龄段的人口数量），使用 d3.scaleLinear 构建一个线性比例尺
  // 具体参考官方文档 https://d3js.org/d3-scale/linear 或 https://github.com/d3/d3-scale/tree/main#linear-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#线性比例尺-linear-scales
  const y = d3.scaleLinear()
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是 6 个州不同年龄段的人口数量中的最大值
    // 这里通过调用两次 d3.max() 来获取最大值
    // 外层的 d3.max(sortData, accessor) 对数据 sortData 进行迭代
    // 而在它的访问器 d => d3.max(ages, age => d[age]) 再使用一次 d3.max() 获取各州的不同年龄段中的最大人数
    // 另外还使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
    // 具体参考官方文档 https://github.com/d3/d3-scale#continuous_nice
    .domain([0, d3.max(sortData, d => d3.max(ages, age => d[age]))]).nice()
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    // 使用 continue.rangeRound() 方法，可以进行修约，以便实现整数（人口）映射到整数（像素）
    .rangeRound([height - marginBottom, marginTop]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
    .attr("transform", `translate(0,${height - marginBottom})`)
    // 横轴是一个刻度值朝下的坐标轴
    // ⚠️ 注意所使用的比例尺是「宏观」比例尺 fx，因为它才是是负责横坐标轴整体的映射关系的
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    // 💡 注意这里使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
    // 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
    // 以便将坐标轴在相应容器内部渲染出来
    // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call 或 https://github.com/d3/d3-selection#selection_call
    // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法
    .call(d3.axisBottom(fx).tickSizeOuter(0))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.selectAll(".domain").remove());

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
    // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
    // 其中第一个参数用于设置刻度数量，这里设置为 `null` 表示采用默认的刻度生成器
    // 而第二个参数用于设置刻度值格式，这里设置为 "s" 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
    // 具体参考 https://en.wikipedia.org/wiki/Metric_prefix
    // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
    .call(d3.axisLeft(y).ticks(null, "s"))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.selectAll(".domain").remove());

  /**
   *
   * 绘制条形图内的柱子
   *
   */
  // 用于格式化 tooltip 文本内容
  // 采用 en 格式来显示数值（即使用千位逗号）
  // 如果所对应的数据不是数值时，则显式为 N/A
  // 参考 https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
  const formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en");

  // 绘制的步骤与一般的条形图会有所不同
  // 首先绘制每个组的容器 <g>，然后分别在每个容器中绘制条带 <rect>
  // 每个容器需要根据所属的宏观分组在横坐标上定位，而每个条带需要根据所属的细分组别在宏观分组区间中定位
  // ⚠️ 所以需要在绘制分组条形图时需要进行数据「二次绑定」
  svg.append("g")
    .selectAll() // 返回一个选择集，其中虚拟/占位元素是 <g> 它们作为宏观分组的容器
    // 绑定数据，每个容器 <g> 对应一个系列数据
    .data(sortData)
    .join("g")
    // 通过设置 CSS 的 transform 属性将宏观分组的容器「移动」到横坐标的相应位置
    // 根据容器所绑定的数据的属性 d.name 州名称，使用比例尺 fx 得到容器在横坐标的定位
    .attr("transform", d => `translate(${fx(d.name)},0)`)
    // 基于原有的选择集进行「次级选择」，选择集会发生改变
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#次级选择
    .selectAll()
    // 返回的选择集是由多个分组（各个 <g> 容器中）的虚拟/占位 <rect> 元素构成的
    // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
    // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
    // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
    // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
    // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
    // 每一个分组都会调用该方法，并依次传入三个参数：
    // * 当前所遍历的分组的父节点所绑定的数据 datum
    // * 当前所遍历的分组的索引 index
    // * 选择集的所有父节点 parent nodes
    // 详细介绍可以查看这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
    // 所以入参是每个宏观分组原本所绑定的数据，即一个对象
    // 从中提取出各年龄段的人口数据，构建为一个数组再返回
    // 这样（在该宏观分组区间中）每个条带 <rect> 元素绑定一个数据点
    .data(d => {
      const arr = [];
      ages.map(age => {
        arr.push({
          state: d.name, // 该人口数据所属的州
          age: age, // 该人口数据所属的年龄段
          population: d[age] // 人口数量
        })
      });
      return arr;
    })
    .join("rect") // 将元素绘制到页面上，使用 <rect> 元素绘制条带
    // 为每个小矩形分别设置左上角 (x, y) 及其 width 和 height 来确定其定位和形状
    // 每个矩形的左上角（相对于所属的宏观分组所在的区间）横轴定位 x 由它所属的年龄段决定
    // 可以通过比例尺 x(d.age) 计算得到
    .attr("x", d => x(d.age))
    // 每个矩形的左上角纵轴定位 y 由该人口数量决定
    // 可以通过比例尺 y(d.population) 计算得到
    .attr("y", d => y(d.population))
    // 条带的宽度
    // 通过比例尺的方法 x.bandwidth() 获取（不包含间隙 padding）
    .attr("width", x.bandwidth())
    // 条带的高度
    // ⚠️ 应该特别留意因为在 svg 的坐标体系中向下和向右是正方向
    // 所以通过比例尺映射后，在 svg 坐标体系里，柱子底部的 y 值 y(0) 是大于柱子顶部的 y 值 y(d.population)
    // 所以条带的高度是 y(0) - y(d.population) 的差值
    .attr("height", d => y(0) - y(d.population))
    .attr("fill", d => color(d.age)) // 设置颜色，不同年龄段对应不同的颜色
    // 最后为每个矩形 <rect> 元素之内添加 <title> 元素
    // 以便鼠标 hover 在相应的小矩形之上时，可以显示 tooltip 提示信息
    .append("title")
    // 设置 tooltip 的文本内容
    // 其中 d.state 是所属的州，d.age 是所属的年龄段，d.population 是具体的人口数量
    .text(d => `${d.state} ${d.age}\n${formatValue(d.population)}`);
});