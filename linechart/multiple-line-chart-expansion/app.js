// 参考自 https://observablehq.com/@d3/sea-ice-extent-1978-2017

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 设置一些关于尺寸的参数
// 获取尺寸大小
const width = container.clientWidth; // 宽度
console.log(width);
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 20;
const marginRight = 30;
const marginBottom = 30;
const marginLeft = 40;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
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
// 数据来源网页 https://observablehq.com/@d3/sea-ice-extent-1978-2017 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/4224701f1ae4651df1d8c53f796357ff/raw/197007c47255ff0d13613fe5170f1a732849f779/sea-ice-extent.csv";

// 使用方法 d3.csv() 读取 csv 文件并载入其中的数据集作为一个数组
// 具体参考官方文档 d3-fetch 模块 https://d3js.org/d3-fetch#csv
// 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
// 第一个参数 dataURL 是字符串，一个指向 csv 文件的链接
// 第二个（可选）参数是一个函数，用于对行数据进行**转换或筛选**（就像为每一行的数据应用数组的 map 函数和 filter 函数）
// 如果设置了转换函数，则数据项（每一行数据，不包含第一行，即表头行）均会调用该函数，并依次传入 3 个参数：
// * d 当前所遍历的数据项（当前的行数据）
// * i 当前所遍历的数据项的索引，从 0 开始计算（即原表格的第二行）
// * columnsArr 一个包含原表格的所有列名的数组
// 最后返回一个对象数组，即其中的每一个元素都是一个对象，它对应于一个数据项（即原始表格中的一行数据），以键值对 key: value 的方式来存储原来的二维数据
// 而且返回的数组具有属性 columns（属性值是一个数组）包含原始数据表的表头信息
d3.csv(
  dataURL,
  // 这里的转换函数只使用了（当前所遍历的数据项）d，并对其进行了解构，以便对数据进行处理或对列名进行「重命名」
  // * date 日期，使用 `new Date(date)` 转换为时间对象
  // * extent 海冰面积，以百万平方公里为单位，这里乘上 `1e6 * extent` 转换为平方公里，并重命名为 value
  ({ date, extent }) => {
    return {
      date: new Date(date),
      value: 1e6 * extent
    }
  }
).then((data) => {
  // 然后对解析得到的结果数组按照时间先后进行升序排列
  data.sort((a, b) => a.date - b.date)

  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  // 该方法用于更改时间对象 Date 的年份，统一为 2000 年
  // 因为横坐标轴的比例尺是使用 2000 年作为定义域范围的，所以这里将入参 date（时间对象 Date）的年份都改为 2000 年，便于将数据点映射到横坐标轴上
  function intrayear(date) {
    date = new Date(+date);
    date.setUTCFullYear(2000);
    return date;
  }

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time 或 https://github.com/d3/d3-scale#time-scales
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc(
    // 设置定义域范围，构建一个数组，表示时间范围是 2000 年
    // 这里的年份是可以任意挑选的，只要定义域范围是一年（即包含 12 个月即可）
    [Date.UTC(2000, 0, 1), Date.UTC(2001, 0, 0)],
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度（减去留白区域）
    [marginLeft, width - marginRight]
  );

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（海冰面积），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear(
    // 设置定义域范围
    // [0, ymax] 其中 ymax 是面积的最高值
    // 通过 d3.max(data, d => d.value) 从数据集中获取面积的最大值
    [0, d3.max(data, d => d.value)],
    // 设置值域范围
    // svg 元素的高度（减去留白区域）
    [height - marginBottom, marginTop]
  );

  // 设置颜色比例尺
  // 为不同折线（对应不同年份）设置不同的配色
  // 使用 d3.scaleSequential 构建一个顺序比例尺 Sequential Scales 将连续型的定义域映射到连续型的值域
  // 它和线性比例尺类似，但是它的配置方式并不相同，通常会指定一个插值器 interpolator 作为值域
  // 该比例尺常用于将数据编码为颜色进行可视化
  // 具体参考官方文档 https://d3js.org/d3-scale/sequential
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#顺序比例尺-sequential-scales
  const z = d3.scaleSequential(
    // 设置定义域范围
    // 从数据集的每个数据点中提取出年份 d.date.getUTCFullYear()，并用 d3.extent() 计算出这些数据的范围
    d3.extent(data, d => d.date.getUTCFullYear()),
    // 设置值域，一个插值器
    // 其中 d3.interpolateSpectral() 是一种配色方案，它会根据传入的参数（范围在 [0,1] 之间）计算出相应的颜色值
    // 它可以在发散型的光谱（从暖色系过渡到冷色系）中选取配色，具体参考官方文档 https://d3js.org/d3-scale-chromatic/diverging#interpolateSpectral
    // 💡 使用该比例尺时，会先将定义域的值进行「标准化」（根据该值在定义域范围中的位置 ❓）变成 0 到 1 之间的值（相当于标准化为百分比）
    // 然后将该值传入该插值器，计算出一个对应的颜色值
    // 这里将标准化所得的值 t 再进行二次处理，传入的值是 1-t，可以将其作用理解为从光谱的末尾（冷色系）开始采集颜色
    t => d3.interpolateSpectral(1 - t)
  );

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
    .call(d3.axisBottom(x)
      // ⚠️ 在 D3 的示例代码中是通过 axis.ticks(count, specifier) 设置刻度数量（参考值）和刻度值的格式
      // ⚠️ 第一个参数是一个数值，用于设置刻度数量（这里设置的是预期值，并不是最终值，D3 会基于出入的数量进行调整，以便刻度更可视）
      // 在示例代码中该参数值是 width / 80 它基于页面的宽度计算出刻度数量的参考值，避免刻度过多导致刻度值重叠而影响图表的可读性
      // ⚠️ 但是该方法用于生成时间轴的刻度依然不妥的，例如对于由月份构成的刻度，即使在较宽的页面，最多也只应有 12 个刻度线才合理
      // ⚠️ 而使用方法 axis.ticks(count) 并不能对刻度数量进行精确的约束
      // 💡 这里可以采用 count 和 interval 混合的方案
      // 💡 在小尺寸页面 width < 1024px 时，采用 axis.ticks(count) 基于页面宽度计算出可读书了的参考值；在大尺寸页面 width >= 1024px 时，采用 axis.ticks(interval) 更佳，根据时间间隔进行采样，生成更合理的刻度数量
      // 具体参考官方文档 https://d3js.org/d3-axis#axis_ticks
      // 参数 interval 是时距器，用于生成特定间距的时间
      // 关于时距器的介绍，可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间边距计算器
      // 这里使用一个 D3 内置的时距器 d3.utcMonth 创建一个以月份为间距的 interval
      .ticks(width < 1024 ? width/80 : d3.utcMonth)
      // 通过 axis.tickFormat(specifier) 设置刻度值的格式
      // 参数 specifier 是时间格式器，将一个 Date 对象格式化 format 为字符串
      // 关于时间格式器的介绍，可以参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#时间格式器
      // 这里 "%B" 表示刻度值采用月份的全写，例如「二月」使用英文 February 来表示
      .tickFormat(d3.utcFormat("%B"))
      // 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .tickSizeOuter(0));

  // 绘制纵坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
    .attr("transform", `translate(${marginLeft},0)`)
    // 纵轴是一个刻度值朝左的坐标轴
    // 并使用坐标轴对象的方法 axis.ticks(count, specifier) 设置坐标轴的刻度数量和刻度值格式
    // 第一个参数用于设置刻度数量，这里设置为 `null` 表示采用默认的刻度生成器
    // 第二个参数是一个字符串，称为 specifier 格式化说明符，用于设置刻度值格式（由于纵坐标轴采用线性比例尺，所以这里采用的是数值格式说明符），这里设置为 "s" 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
    // 具体参考 https://en.wikipedia.org/wiki/Metric_prefix
    // 关于 D3 所提供的数值格式具体参考官方文档 https://github.com/d3/d3-format
    .call(d3.axisLeft(y).ticks(null, "s"))
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove())
    // 复制了一份刻度线（除了第一条刻度线），用以绘制图中横向的参考线
    .call(g => g.selectAll(".tick:not(:first-of-type) line").clone()
      .attr("x2", width) // 调整复制后的刻度线的终点位置（往右移动）
      .attr("stroke", "#ddd")) // 设置参考线的颜色为灰色
    // 为坐标轴添加额外信息名称（一般是刻度值的单位等信息）
    // 这里并没有添加一个 <text> 元素，而是复制坐标轴的最后一个刻度（通过 class 选择器 .tick:last-of-type）里面的 `<text>` 标签，再调整其位置，并设置内容
    .call(g => g.select(".tick:last-of-type text").clone()
      .attr("x", 3) // 将文本向右边设置一点小偏移
      .attr("text-anchor", "start") // 设置文本的对齐方式
      .attr("font-weight", "bold") // 设置字体粗细
      .text("km²")); // 设置文本内容

  /**
  *
  * 绘制折线图内的线段
  *
  */
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const line = d3.line()
    // 💡 调用线段生成器方法 line.defined() 设置数据完整性检验函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数也是有三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，线段线段生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前线段就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一段段分离的线段
    // 这里通过判断数据点的属性 d.value（面积）是否为 NaN 来判定该数据是否缺失
    .defined(d => !isNaN(d.value))
    // 设置横坐标读取函数
    // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于每个数据点的日期 d.date 并采用比例尺 x 进行映射，计算出相应的横坐标
    // 但是横坐标轴的比例尺是使用 2000 年作为定义域范围的，所以这里要先使用方法 intrayear() 将 d.date（时间对象 Date）的年份都改为 2000 年，再采用比例尺 x 进行映射，计算出相应的横坐标
    .x(d => x(intrayear(d.date)))
    // 设置纵坐标读取函数
    .y(d => y(d.value));

  // 创建一个容器，用于包含这些折线
  // 便于统一设置字体样式（折线的注释文字）和线段的样式
  const g = svg.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("fill", "none")
    .attr("stroke-width", 1.5)
    // stroke-miterlimit 属性约束两段折线相交时接头的尖端长度
    // 如果在绘制折线图时数据点较多，可以将元素 `<path>` 的属性 `stroke-miterlimit` 设置为 `1`
    // 以避免折线「锋利」交接处过渡延伸，导致该点的数据偏移
    .attr("stroke-miterlimit", 1);

  function dashTween() {
    const length = this.getTotalLength();
    // 返回一个插值器
    // 计算从 (0, l) 到 (l, l) 之间的插值
    return d3.interpolate(`0,${length}`, `${length},${length}`);
  }

  // Animate: add lines iteratively.
  // 使用异步函数 async-await 来实现依年份次序绘制多条折线
  async function animate() {
    // 先使用方法 d3.group(iterable, ...keys) 对可迭代对象的元素进行分组转换
    // 第一个参数 iterable 是需要分组的可迭代对象
    // 第二个参数 ...keys 是一系列返回分组依据的函数，数据集中的每个元素都会调用该函数，入参就是当前遍历的元素 d
    // 并返回一个 InterMap 对象（映射，键名是分组依据，相应的值是在原始数组中属于该分组的元素）
    // 具体可以参考官方文档 https://d3js.org/d3-array/group#group
    // 或参考这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#转换
    // 这里是基于年份 d => d.date.getUTCFullYear() 对数据集 data 的元素进行分组
    // 然后在循环结构中对返回的 InterMap 对象进行遍历
    // 在遍历时它变成一系列的二元数组，这里h还对其进行了解构 [key, values]
    // 该数组的第一个元素是键名 key（即年份，是该分组的依据），第二个元素是的该分组的数据 values（一个数组，由原数据集中属于该分组的数据点组成）
    for (const [key, values] of d3.group(data, d => d.date.getUTCFullYear())) {

      // 将当前所遍历的分组数据（某个年份的数据）线段路径绘制到页面上
      await g.append("path") // 使用路径 <path> 元素绘制折线
        // 调用线段生成器，将所当前分组的数据 values 作为参数传递到方法 line() 中
        // 返回的结果是字符串，作为 `<path>` 元素的属性 `d` 的值
        .attr("d", line(values))
        // 设置折线描边的颜色，基于当前分组的年份，通过颜色比例尺 z 映射得到相应的颜色值
        .attr("stroke", z(key))
        // 通过属性 stroke-dasharray 设置路径（描边）的**点划线**的图案规则，作为路径展开动画的初始状态
        // 该属性值由一个或多个（用逗号或者空白隔开）数字构成
        // 这些数字组合会依次表示划线和缺口的长度（该数字可以表示长度或百分值）
        // 即第一个数字表示划线的长度，第二个数表示缺口的长度，然后下一个数字又是划线的长度，依此类推
        // 如果该属性值的数字之和小于路径长度，则重复这个数字来绘制划线和缺口，这样就会出现规律的点划线图案
        // 这里首先将属性 stroke-dasharray 设置为 `0, 1`
        // 即路径的划线部分为 0，全部都是缺口
        // 所以其效果是在过渡开始时，路径为空，即折线不可见
        .attr("stroke-dasharray", "0,1")
        // 设置过渡动效
        // 更改的属性是 stroke-dasharray
        .transition()
        .ease(d3.easeLinear) // 设置缓动函数
        // 方法 dashTween 返回一个插值器
        // 在过渡期间，会调用这个插值器计算 stroke-dasharray 的值，以实现折线的展开动效
        .attrTween("stroke-dasharray", dashTween)
        // 使用 transition.end() 方法，它返回一个 Promise
        // 这个 Promise 仅在过渡管理器所绑定的选择集合的所有过渡完成时才 resolve；如果过渡被中断或取消，就会被 reject
        // 这里可以实现在绘制完当前年份所对应的折线时（过渡结束时）才继续执行下一个操作（为当前折线添加标注文字，以及开启下一条折线的绘制）
        .end();

      // 当折线绘制完成后，在它的后面添加上年份标注
      // 由于标注文本的定位在折线的末端，即该分组的最后一个数据点的附近，这里先判断该分组最后一个数据是否完整（不是 NaN）
      if (!isNaN(values[values.length - 1].value)) {
        // 为前面绘制出来的折线添加注释信息
        g.append("text") // 使用 <text> 元素添加文本
          // 设置文本的 fill 填充、stroke 描边、mark 标记的绘制顺序
          // 这里是先绘制描边，然后再是填充，避免白色描边遮挡了黑色的字体
          // 具体介绍查看 https://developer.mozilla.org/en-US/docs/Web/CSS/paint-order
          .attr("paint-order", "stroke")
          .attr("stroke", "white") // 设置文字的描边颜色为白色
          .attr("stroke-width", 3) // 设置描边的宽度
          // 设置文字填充的颜色，基于该分组的年份，通过颜色比例尺 z 映射得到相应的颜色值
          .attr("fill", z(key))
          .attr("dx", 4) // 将文本稍微向右移动，避免与折线重叠
          .attr("dy", "0.32em") // 将文本稍微向下移动，让文本与折线（最后一个数据点）水平居中对齐
          // 设置 <text> 元素的定位 (x, y) 基于该折线最后一个数据点的位置
          // 但是横坐标轴的比例尺是使用 2000 年作为定义域范围的，所以这里要先使用方法 intrayear() 将该数据（时间对象 Date）的年份都改为 2000 年，再采用比例尺 x 进行映射，计算出相应的横坐标
          .attr("x", x(intrayear(values[values.length - 1].date)))
          .attr("y", y(values[values.length - 1].value)) // 纵坐标值
          .text(key); // 设置注释内容，是当前分组的依据，即年份
      }
    }
  }

  // Start the animation and return the chart.
  // 开启动画，绘制折线
  requestAnimationFrame(animate);
});
