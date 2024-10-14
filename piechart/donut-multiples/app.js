// 参考自 https://observablehq.com/@d3/donut-multiples

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/donut-multiples 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/7f7567ac17e75e5d8248e5dd83eae3d4/raw/6385e6176aa4bd612f6fc3d0906a651da3ece908/state-age.csv";

// 读取 csv 文件
d3.csv(dataURL, d3.autoType).then((result) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(result);

  /**
   *
   * 对原始数据进行转换处理
   *
   */
  // 解析所得的可迭代对象（数组）具有属性 columns
  // 该属性的值是一个数组，元素分别是原数据的列属性（即原来二维数据表的表头信息）
  // 这里使用 JS 数组的原生方法 array.slice(1) 从第二个元素开始（包含所有年龄段）将其拷贝一份，用于后面的数据转换
  const columns = result.columns.slice(1);

  // 遍历每个元素，并基于它生成一个对象 {state: string, sum: number, ages: array} 作为（返回的新数组的对应索引值的）新元素
  // 该对象各属性的含义：
  // * 属性 state 是当前所遍历的数据点所属的州的名称，采用当前所遍历元素的属性 d.state
  // * 属性 sum 是该州的总人数，通过 d3.sum(array, accessor) 进行求和
  //   其中第一个参数 columns 是一个数组，包含所有年龄段
  //   而第二个参数是 accessor 数据访问器 (key) => +d[key] 对于每一个年龄段 key，从当前数据点 d 读取出该州相应年龄段的人数（并转换为数值）+d[key]
  //   最后进行求和就得到该州的总人口数量
  // * 属性 ages 是一个数组，包含该州具体各个年龄段的人口数量
  //   基于 columns 数值采用 JS 数组的原生方法 array.map() 进行转换而得
  //   它的每个元素都是一个对象 {age: string, population: number} 表示年龄段为 key 的人口数量 +d[key]
  const data = result.map((d, i) => ({
    state: d.State,
    sum: d3.sum(columns, (key) => +d[key]),
    ages: columns.map((key) => ({ age: key, population: +d[key] }))
  }));

  console.log(data);

  /**
   *
   * 构建比例尺
   *
   */
  // 设置颜色比例尺
  // 为环形图的不同扇形区域设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
    // 设置定义域范围
    // 各扇形所表示的年龄段，即 7 种年龄段
    .domain(columns)
    // 设置值域范围，对应 7 种颜色值
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

  /**
   *
   * 对数据进行转换
   *
   */
  // Create the pie layout and arc generator.
  // 使用 d3.pie() 创建一个 pie 饼图角度生成器
  // 饼图角度生成器会基于给定的数据，计算各数据项所对应的扇形在饼图中所占的角度
  // 调用饼图角度生成器时返回的结果是一个数组，它的长度和入参的数组长度一致，元素的次序也一样，其中每个元素（是一个对象）依次对应一个数据项，并包含以下属性：
  // * data 数据项的值
  // * value 一个数值，它代表了该数据项，被用于在 Pie 饼图生成器里进行运算（以计算该数据项所需占据的角度）
  // * index 数据项的索引，从 0 开始
  // * starAngle 该数据项在扇形或环形中所对应的起始角
  // * endAngle 该数据项在扇形或环形中所对应的结束角
  // * padAngle 扇形或环形的间隔角度
  // 具体可以参考官方文档 https://d3js.org/d3-shape/pie
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#pies-饼图角度生成器
  const pie = d3.pie()
  // 设置数据项的排序对比函数（用于决定相应扇形的优先次序）
  // 💡 此处所说的排序，实际上体现在各数据项所对应的扇形的起始角度和结束角度上，而不会改变数组中的元素的次序（经过排序后返回的数组的元素次序，和数据表中数据项的顺序是相同的）
  // 虽然数据项的排序对比函数默认值就是 `null`，但是这里依然显式地将对比函数设置为 null
  // 这是为了让 D3 隐式地调用 `pie.sortValues(null)` 将数据项转换值的对比函数设置为 `null`（它的默认值是 `d3.descending` 降序排列），以忽略按数据项的转换值进角度排序
  // 如果 `pie.sort` 数据项的对比函数 ，以及 `pie.sortValues` 它的转换值的对比函数都是 `null`，则各扇形的排序与原始数据集中各数据项顺序一致
  // 所以最终各扇形是按照相应的数据项在原始数据集中的顺序进行排序（即年龄段从小到大进行排序）
  .sort(null)
  .padAngle(0.02) // 设置环形图里各个扇形之间的间隔角度
  // 设置 value accessor 数据访问器/读取函数，即每个数据项经过该函数的转换后，再传递给 Pie 饼图角度生成器
  // 数据读取函数的逻辑要如何写，和后面 👇👇 调用饼图角度生成器时，所传入的数据格式紧密相关
  // 在后面绘制环状扇形时，向饼图角度生成器所传递的数组是表示某个州的各个年龄段的人口数量
  // 则在迭代时数据点 d 是一个对象 {age: string, population: number}（表示某个州的特定年龄段的人口数量）
  // 这里获取获取人口数量 d.population
  .value((d) => d.population);

  /**
   *
   * 绘制环形图
   * 每个环形图都使用单独的一个 <svg> 容器进行渲染
   * 💡 由于 <svg> 默认是 inline 元素，所以页面会自动将多个 <svg> 进行排版，最终效果是多个环形图不重叠地展示在页面上
   * 如果只采用一个 <svg> 来渲染所有的环形图，则需要（繁琐的坐标计算）手动在它们定位到 svg 画布中
   *
   */
  // 该变量用于计算各个环形的内外半径（取一个固定值，所以最终每个环形图的面积都是相同的）
  const r = 74; // constant radius

  // 使用 d3.arc() 创建一个 arc 扇形生成器
  // 扇形生成器会基于给定的数据生成扇形形状
  // 调用扇形生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/arc
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#扇形生成器-arcs
  const arc = d3.arc()
    // 设置扇形的间隔半径（根据间隔角度结合间隔半径算出间隔弧长）
    .padRadius(50);

  // 在页面创建一个 <div> 作为最外层容器，包裹一系列的 <svg> 元素
  const wrapper = d3.select("#container")
                    .append("div");

  // 绘制一系列环形图
  const svg = wrapper.selectAll(".pie") // 返回一个选择集，其中虚拟/占位元素是一系列的 <svg class="pie"> 元素，用于分别绘制一个个环形图
      // 绑定数据 data（它基于各州的总人数降序排列，即人数较多的州先绘制）
      .data(data.sort((a, b) => b.sum - a.sum))
    .enter().append("svg") // 将元素绘制到页面上
      // 为每个 <svg> 添加 CSS class "pie" 类名（对应上面选择集的操作）
      .attr("class", "pie")
      // 使用方法 selection.each(func) 为选择集中的每个元素都调用一次函数 func 执行相应的操作
      // 在调用入参函数 func(d, i, nodes) 时，会依次传递三个参数：
      // * 当前所遍历的元素所绑定的数据 datum `d`
      // * 当前所遍历的元素在分组中的索引 index `i`
      // * 当前分组的所有节点 `nodes`
      // 具体参考 d3-selection 模块的官方文档 https://d3js.org/d3-selection/control-flow#selection_each
      // 这里调用方法 multiple() 在每个 <svg> 元素里绘制一个环形图
      // 💡 通过该方法可以创建一个上下文，可以同时访问到当前所遍历的元素，以及它的子元素
      // 💡 由于在回调函数 func 里 this 就指向当前所遍历的元素，可以通过 `d3.selection(this)` 创建（仅包含当前所遍历元素）的选择集，然后再通过方法 `selection.selectAll()` 获取子元素（其中 selection 表示通过 `d3.selection(this)` 所创建的选择集）
      .each(multiple)
    .select("g"); // 最后选择每个 <svg> 里的 <g> 容器（由于它经过了位置调整，便于后面为每个环形图添加文本注释）

  // 绘制环形图的核心代码
  // 传入的参数 `d` 是（包含一系列 svg 元素的）选择集当前遍历的元素所绑定的数据
  // 它是一个对象 {state: string, sum: number, ages: array}
  // 而函数内的 this 指向当前所遍历的元素，即相当于 nodes[i]
  function multiple(d) {
    // 💡 通过 d3.selection(this) 创建的选择集，包含的元素视为父元素
    // 💡 以及 selection.selectAll() 创建的选择集，包含的元素视为子元素（或后代元素）
    // 💡 在该函数（环境/上下文）里可以同时访问父元素和子元素/后代元素

    // 返回的选择集所包含的元素是（在 <svg> 元素里所添加的）<g> 元素
    const svg = d3.select(this) // 💡 首先创建一个选择集，它包含当前所遍历的 <svg> 元素
        // 设置该 <svg> 元素的尺寸，它的宽和高都是环形图的直径
        .attr("width", r * 2)
        .attr("height", r * 2)
      // 创建一个 <g> 容器
      // 💡 这里会引起选择集变化，选中的元素是新增的（子元素）<g> 容器
      .append("g")
        // 通过 CSS transform 将容器 <g> 进行移动（向右移动半径长度 r，向下移动半径长度 r）
        // 让环形图的圆心绘制在 svg 的中心位置
        .attr("transform", `translate(${r},${r})`);

    // 在 <g> 容器里绘制一个环形图
    svg.selectAll(".arc") // 返回一个选择集，其中虚拟/占位元素是一系列的 <path class="arc"> 元素，用于分别环形图的各个扇形部分，💡 这里选中的是后代元素
        // 绑定数据
        // 调用饼图角度生成器 pie，对数据集 d.ages 进行转换处理
        // 计算出每个数据点（该州的各个年龄段）所对应的扇形的相关信息（主要是起始角和结束角）
        .data((d) => pie(d.ages))
      .enter().append("path") // 将元素绘制到页面上
        .attr("class", "arc") // 为各个 <path> 路径元素添加 CSS class "arc" 类名（对应上面选择集的操作）
        // 调用扇形生成器 arc
        // 同时还为扇形生成器设置内外半径，由于内半径不为 0 所以生成环状扇形（如果参数为 0 则生成完整扇形）
        // 由于扇形生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
        // 所以调用扇形生成器 arc 返回的结果是字符串
        // 该值作为 `<path>` 元素的属性 `d` 的值
        .attr("d", arc.outerRadius(r).innerRadius(r * 0.6))
        // 设置颜色，不同扇形对应不同的颜色
        // 其中 d 是所绑定的数据（由饼图角度生成器所生成的），d.data 是原始数据点，所以 d.data.age 就是该扇形所对应的年龄段（名称）
        // 再通过颜色比例尺 color() 可以得到该扇形的相应颜色值
        .style("fill", (d) => color(d.data.age));
  }

  /**
   *
   * 添加标注信息
   *
   */
  // 这里使用了 d3.format() 构建一个数值格式器，对数字进行修约等处理，生成更易于阅读的刻度值
  // 具体参考 d3-format 模块的官方文档 https://d3js.org/d3-format
  // 格式器的参数 .1s 称为 specifier 数字格式说明符，它类似于正则表达式，由一系列指令构成
  // 其中 s 表示数值采用 SI-prefix 国际单位制词头，例如 k 表示千，M 表示百万
  // 而前面的 .1 表示所需保留的有效数字
  const formatSum = d3.format(".1s");

  // svg 是一个选择集，它包含多个分组，每个分组包含一个环形图的容器（即 <svg> 里的 <g> 容器）
  // 在每个环形图容器里添加 <text> 元素，用于设置文本标注
  const label = svg.append("text")
      .attr("class", "label"); // 为 <text> 元素添加 CSS class "label" 类名

  // 在每个 <text> 元素里添加一个 <tspan> 元素
  // 它相当于在 svg 语境下的 span 元素，用于为部分文本添加样式（这里用于实现文本的换行效果）
  label.append("tspan")
      .attr("class", "label-name") // 为 <tspan> 元素添加 CSS class "label-name" 类名
      .attr("x", 0)
      // 设置 <tspan> 元素的纵向偏移量，是 -.2em 表示向上移动，相当于在第一行（em 单位是与字体大小相同的长度）
      .attr("dy", "-.2em")
      .text((d) => d.state); // 设置文本内容，该环形图所表示的州的名称 d.state

  // 再在每个 <text> 元素里添加一个 <tspan> 元素
  label.append("tspan")
      .attr("class", "label-value") // 为 <tspan> 元素添加 CSS class "label-value" 类名
      .attr("x", 0)
      // 设置 <tspan> 元素的纵向偏移量，是 1.1em 表示向下移动，相当于在第二行（em 单位是与字体大小相同的长度）
      .attr("dy", "1.1em")
      .text((d) => formatSum(d.sum));  // 设置文本内容，该州的总人口数量 d.sum（该数值采用数值格式器 formatSum 进行处理）

  // 在最外层容器的最后添加一个 <style> 元素，并在里面编写样式
  // ⚠️ 一般 <style> 放置在页面顶部的 <head> 元素里
  // 其中每一条样式规则的作用：
  // * `.pie` 用于设置每个环形图之间的留白间距
  // * `.label` 和 `.label-name` 用于设置标注的文本样式
  wrapper.append("style").text(`
    .pie {margin: 4px;}
    .label {font: 10px sans-serif;text-anchor: middle;}
    .label-name {font-weight: bold;}
  `);

});
